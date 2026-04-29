using System;

namespace What_are_the_basic_string_operations
{
    class Program
    {
        static void Main(string[] args)
        {
            //Concatenate: Two strings can be concatenated by using + operator. 
            string str1 = "Concatenate";
            string str2 = "Example";
            string str3 = str1 + str2;

            Console.WriteLine(str3);

            //Modify: Replace() function is used to modify a string.
            string str4 = "This is one";
            str4 = str4.Replace("one", "two");

            Console.WriteLine(str4);


            //Trim:  Trim() function is used to trim the white spaces in a string at the end.
            string str5 = "This is trim  ";
            str5.Trim();

            Console.WriteLine(str5);


            //Contains: Check if a string contains a pattern of substring or not.
            string str = "This is test";
            
            if (str.Contains("test"))
                Console.WriteLine("The 'test' was found.");


            Console.ReadLine();
        }
    }
}
