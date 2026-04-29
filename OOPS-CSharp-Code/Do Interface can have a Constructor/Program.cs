using System;

//Q. Do Interface can have a Constructor?
//Q. Can you create an instance of an Abstract class or an Interface?
namespace Do_Interface_can_have_a_Constructor
{
    class Program
    {
        static void Main(string[] args)
        {
            //IEmployee emp = new IEmployee();
            Console.WriteLine("Hello World!");
        }
        interface IEmployee
        {
            //public IEmployee()
            //{

            //}
            public void Salary();
        }

        public class PermanentEmployee : IEmployee
        {
            public void Salary()
            {
                Console.WriteLine("2000000");
            }          
        }
    }
}
