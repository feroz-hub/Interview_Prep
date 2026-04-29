using System;

//Q. When to use Interface and when Abstract class?
namespace When_to_use_Interface_and_when_Abstract_class
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
        }
    }  
   
    public class PermanentEmployee
    {

    }

    public class ContractualEmployee
    {

    }
       
    interface IEmployee
    {
        public void AssignEmail();

        public void AssignManager();
    }

    public abstract class EmployeeDress
    {
        public abstract void DressCode();

        public void DressColor()
        {
            Console.WriteLine("BLUE");
        }
    }

    public class TemporaryEmployee
    {

    }

}
